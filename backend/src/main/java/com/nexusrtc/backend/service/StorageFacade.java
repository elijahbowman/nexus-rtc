package com.nexusrtc.backend.service;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class StorageFacade {

    private final MinioClient minioClient;
    private final String bucketName;

    // Inject persistent Docker environment keys cleanly via the constructor framework
    public StorageFacade(
            @Value("${minio.url}") String url,
            @Value("${aws.access.key.id}") String accessKey,
            @Value("${aws.secret.access.key}") String secretKey,
            @Value("${minio.bucket.name}") String bucketName) {

        this.bucketName = bucketName;
        this.minioClient = MinioClient.builder()
                .endpoint(url)
                .credentials(accessKey, secretKey)
                .build();
    }

    /**
     * Core Facade Upload Action: Processes an incoming multipart stream
     * and maps it to a unique object identifier key inside the MinIO bucket layer.
     */
    public String uploadFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file container payload.");
        }

        try {
            // Generate a secure, cryptographically random object key to avoid namespace collisions
            String uniqueFileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(uniqueFileName)
                                .stream(inputStream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build()
                );
            }

            // Return the unique file key path wrapper to persist inside PostgreSQL records
            return uniqueFileName;

        } catch (Exception e) {
            throw new RuntimeException("Fatal error parsing object storage stream transmission line: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a secure, temporary, pre-signed URL to allow front-end clients
     * to safely stream down files without making your S3 bucket completely public.
     */
    public String getPresignedUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectKey)
                            .expiry(2, TimeUnit.HOURS) // Token expires in 2 hours for security compliance
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate secure presigned object target download vector: " + e.getMessage(), e);
        }
    }
}